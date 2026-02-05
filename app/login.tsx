import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useAuth } from "@clerk/clerk-expo";

/**
 * Página de login usando el componente prebuilt de Clerk
 * Este componente maneja automáticamente:
 * - Login con email/contraseña
 * - OAuth con Google
 * - Registro de usuarios
 * - Recuperación de contraseña
 */
export default function LoginScreen() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(drawer)");
    }
  }, [isSignedIn, router]);

  if (Platform.OS === "web") {
    // Para web, usar el componente de @clerk/clerk-react
    try {
      const { SignIn } = require("@clerk/clerk-react");
      
      return (
        <View style={styles.container}>
          <SignIn 
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            afterSignInUrl="/(drawer)"
            appearance={{
              elements: {
                rootBox: {
                  width: "100%",
                  maxWidth: "400px",
                },
                card: {
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  borderRadius: "12px",
                },
              },
            }}
          />
        </View>
      );
    } catch (error) {
      console.error("[LoginScreen] Error loading @clerk/clerk-react:", error);
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <p>Error al cargar el componente de login. Por favor, recarga la página.</p>
          </View>
        </View>
      );
    }
  } else {
    // Para native, usar el componente de @clerk/clerk-expo
    const { SignIn } = require("@clerk/clerk-expo");
    
    return (
      <View style={styles.container}>
        <SignIn />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 4,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
});
