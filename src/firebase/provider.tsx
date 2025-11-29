// src/firebase/provider.tsx
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, updateDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';
import type { UserProfile } from '@/types/user';
import { addDays } from 'date-fns';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Define uma interface para o estado derivado da assinatura
interface EffectiveSubscriptionState {
  effectiveSubscriptionStatus: 'free' | 'premium' | 'professional';
  isAdmin: boolean;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState, EffectiveSubscriptionState {
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult extends UserAuthState, EffectiveSubscriptionState { 
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    userProfile: null,
    isUserLoading: true, // Start loading and wait for Firebase to initialize.
    userError: null,
  });

  const previousSubscriptionStatus = useRef<string | undefined>(undefined);

  // Effect to handle redirection after a successful payment
  useEffect(() => {
    const profile = userAuthState.userProfile;
    if (!profile || userAuthState.isUserLoading) return;

    const currentStatus = profile.subscriptionStatus || 'free';
    const previousStatus = previousSubscriptionStatus.current;
    
    // Check if a payment flow was initiated and the status has positively changed
    if (pathname.startsWith('/checkout') && previousStatus === 'free' && (currentStatus === 'premium' || currentStatus === 'professional')) {
        router.push('/checkout/success');
    }
    
    // Update the previous status for the next render
    previousSubscriptionStatus.current = currentStatus;

  }, [userAuthState.userProfile, userAuthState.isUserLoading, router, pathname]);


  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, userProfile: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in.
        setUserAuthState(prevState => ({ ...prevState, user: firebaseUser, isUserLoading: true }));
      } else {
        // User is signed out. Final state, no more loading.
        setUserAuthState({ user: null, userProfile: null, isUserLoading: false, userError: null });
      }
    }, (error) => {
      console.error("FirebaseProvider: onAuthStateChanged error:", error);
      setUserAuthState({ user: null, userProfile: null, isUserLoading: false, userError: error });
    });

    return () => unsubscribeAuth();
  }, [auth]);
  
  // Effect to fetch user profile ONLY when a user is authenticated.
  useEffect(() => {
    if (!userAuthState.user || !firestore) {
      if (!userAuthState.user) {
        setUserAuthState(prevState => ({...prevState, isUserLoading: false, userProfile: null}));
      }
      return;
    }
  
    const userRef = doc(firestore, 'users', userAuthState.user.uid);

    const unsubscribeProfile = onSnapshot(userRef, 
        async (profileDoc) => {
            if (profileDoc.exists()) {
                const profileData = { id: profileDoc.id, ...profileDoc.data() } as UserProfile;
                
                const updates: Partial<UserProfile> = {};
                if (!profileData.dashboardShareCode) {
                    updates.dashboardShareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                }
                if (!profileData.role) {
                    updates.role = 'patient';
                }
                 if (!profileData.profileType) {
                    updates.profileType = 'patient';
                }

                if (Object.keys(updates).length > 0) {
                    console.log(`Profile for user ${profileData.id} is missing fields. Updating...`, updates);
                    updateDoc(userRef, updates).catch(e => console.error("Failed to update missing profile fields", e));
                    // The listener will be re-triggered with the updated data.
                } else {
                    setUserAuthState(prevState => ({ 
                        ...prevState,
                        userProfile: profileData, 
                        isUserLoading: false, 
                        userError: null 
                    }));
                }

            } else {
                // Profile doesn't exist, let's create one.
                console.log(`Profile for user ${userAuthState.user?.uid} not found. Creating one.`);
                try {
                    const newShareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                    const newUserProfile: Omit<UserProfile, 'id'> = {
                        fullName: userAuthState.user?.displayName || "Novo Usuário",
                        email: userAuthState.user?.email || "",
                        createdAt: serverTimestamp(),
                        dashboardShareCode: newShareCode,
                        subscriptionStatus: 'free',
                        profileType: 'patient',
                        role: 'patient',
                        calorieGoal: 2000,
                        proteinGoal: 140,
                        waterGoal: 2000,
                        status: 'active'
                    };
                    await setDoc(userRef, {id: userAuthState.user.uid, ...newUserProfile});
                    // The onSnapshot listener will be re-triggered with the new data.
                } catch (creationError) {
                    console.error("Failed to create user profile:", creationError);
                     setUserAuthState(prevState => ({ 
                        ...prevState, 
                        userProfile: null, 
                        userError: creationError as Error, 
                        isUserLoading: false 
                    }));
                }
            }
        }, 
        (error) => {
            console.error("FirebaseProvider: onSnapshot profile error:", error);
            setUserAuthState(prevState => ({ 
                ...prevState, 
                userProfile: null, 
                userError: error, 
                isUserLoading: false 
            }));
        }
    );
    return () => unsubscribeProfile();

  }, [userAuthState.user, firestore]);

  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    if (!userAuthState.user || !firestore) {
      throw new Error("Usuário não autenticado ou serviço de banco de dados indisponível.");
    }
    const userRef = doc(firestore, 'users', userAuthState.user.uid);
    await updateDoc(userRef, updatedProfile);
    // The onSnapshot listener will automatically update the userProfile state
  };


  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    
    const profile = userAuthState.userProfile;
    let effectiveStatus: EffectiveSubscriptionState['effectiveSubscriptionStatus'] = 'free';
    const isAdmin = profile?.role === 'admin';

    if (profile) {
        const storedStatus = profile.subscriptionStatus || 'free';
        
        // Handle Firestore Timestamp object or JavaScript Date object
        const expiresAt = profile.subscriptionExpiresAt 
            ? (profile.subscriptionExpiresAt as Timestamp).toDate 
              ? (profile.subscriptionExpiresAt as Timestamp).toDate() 
              : profile.subscriptionExpiresAt as Date
            : null;

        const isExpired = expiresAt ? new Date() > expiresAt : true;
        
        if (storedStatus !== 'free' && !isExpired) {
            effectiveStatus = storedStatus;
        }
    }


    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      userProfile: userAuthState.userProfile,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      effectiveSubscriptionStatus: effectiveStatus,
      isAdmin,
      onProfileUpdate: handleProfileUpdate,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebaseContext = (): FirebaseContextState => {
    const context = useContext(FirebaseContext);
     if (context === undefined) {
        throw new Error('useFirebaseContext must be used within a FirebaseProvider.');
    }
    return context;
}

export const useFirebase = (): Omit<FirebaseContextState, 'user' | 'userProfile' | 'isUserLoading' | 'userError' | 'onProfileUpdate' | 'areServicesAvailable' | 'effectiveSubscriptionStatus' | 'isAdmin'> => {
  const context = useFirebaseContext();
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore | null => {
  const context = useFirebaseContext();
  return context.firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, userProfile, isUserLoading, userError, and onProfileUpdate.
 */
export const useUser = (): UserHookResult => {
  const { user, userProfile, isUserLoading, userError, onProfileUpdate, effectiveSubscriptionStatus, isAdmin } = useFirebaseContext();
  return { user, userProfile, isUserLoading, userError, onProfileUpdate, effectiveSubscriptionStatus, isAdmin };
};
