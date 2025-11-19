
// src/firebase/provider.tsx
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, updateDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';
import type { UserProfile } from '@/types/user';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult extends UserAuthState { 
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
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    userProfile: null,
    isUserLoading: true, // Start loading and wait for Firebase to initialize.
    userError: null,
  });

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
                
                // BUG FIX: Check if a patient profile is missing a share code and generate one.
                if (profileData.profileType === 'patient' && !profileData.dashboardShareCode) {
                    const newShareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                    console.log(`Generating missing share code for user ${profileData.id}: ${newShareCode}`);
                    await updateDoc(userRef, { dashboardShareCode: newShareCode });
                    // The onSnapshot listener will re-trigger with the updated data, so no need to set state here.
                    return; // Exit to avoid setting state with incomplete data
                }
                
                setUserAuthState(prevState => ({ 
                    user: prevState.user, // Explicitly preserve user object
                    userProfile: profileData, 
                    isUserLoading: false, 
                    userError: null 
                }));
            } else {
                // Profile doesn't exist, let's create one.
                console.log(`Profile for user ${userAuthState.user?.uid} not found. Creating one.`);
                try {
                    const newShareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                    const newUserProfile: Omit<UserProfile, 'id'> = {
                        fullName: userAuthState.user?.displayName || "Novo Usuário",
                        email: userAuthState.user?.email || "",
                        createdAt: serverTimestamp(),
                        profileType: 'patient',
                        role: 'patient',
                        dashboardShareCode: newShareCode, // Add share code on creation
                        subscriptionStatus: 'free',
                        calorieGoal: 2000,
                        proteinGoal: 140,
                        waterGoal: 2000,
                    };
                    await setDoc(userRef, {id: userAuthState.user.uid, ...newUserProfile});
                    // The onSnapshot listener will be re-triggered with the new data,
                    // so we just set loading to false here.
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
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      userProfile: userAuthState.userProfile,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
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

export const useFirebase = (): Omit<FirebaseContextState, 'user' | 'userProfile' | 'isUserLoading' | 'userError' | 'onProfileUpdate' | 'areServicesAvailable'> => {
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
  const { user, userProfile, isUserLoading, userError, onProfileUpdate } = useFirebaseContext();
  return { user, userProfile, isUserLoading, userError, onProfileUpdate };
};
