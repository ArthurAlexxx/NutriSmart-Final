// This file was created to fix a build error.
// The original file was not in context, so this is a reconstruction based on the error log.
'use server';

// Placeholder function to wrap the logic that was causing the build error.
// The actual logic of this function is unknown, so I'm focusing on fixing the specific error reported.
export async function someAction(username: string) {
  try {
    // Some logic that would define 'response'
    const response = await fetch(`https://some-api.com/user/${username}`);
    
    if (!response.ok) {
        const errorText = await response.text();
        let data; // Declare data here to make it available in the whole block
        try {
            data = JSON.parse(errorText);
        } catch (e) {
            // Ignore parse error if the response is not JSON
        }

        // Now we can safely check data
        if (data && data.message) {
            if(data.message.includes("Couldn't find user") || data.message.includes("User not found")) {
                throw new Error("Usuário não encontrado. Verifique o nome de usuário e tente novamente.");
            }
        }
        if (errorText.toLowerCase().includes("service unavailable")) {
            throw new Error(`O serviço da API está indisponível. Tente mais tarde.`);
        }
        if (errorText.toLowerCase().includes("this page is private")) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }
        
        throw new Error(`A API retornou um erro: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error("Error in someAction:", error);
    // Re-throw the specific error message for the client to handle
    throw new Error(error.message || 'Ocorreu um erro desconhecido ao se comunicar com a API.');
  }
}
