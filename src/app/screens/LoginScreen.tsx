// src/app/screens/LoginScreen.tsx
import { Eye, EyeOff, Lock, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../../lib/supabase";

type Props = {
  navigation: any;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
      } else {
        navigation.replace("Home");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <User size={34} color="#2b6ef6" />
            </View>
            <Text style={styles.title}>Bienvenue</Text>
          </View>

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputRow}>
              <User size={18} color="#7b8fa6" />
              <TextInput
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputRow}>
              <Lock size={18} color="#7b8fa6" />
              <TextInput
                placeholder="Mot de passe"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={[styles.input, { flex: 1 }]}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={{ padding: 6 }}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#666" />
                ) : (
                  <Eye size={18} color="#666" />
                )}
              </TouchableOpacity>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.button, loading ? styles.buttonDisabled : null]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Signup link */}
            <View style={styles.row}>
              <Text style={styles.smallText}>Pas de compte ?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Signup")}
                disabled={loading}
              >
                <Text style={styles.linkText}> S'inscrire</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot password (simple) */}
            <TouchableOpacity
              onPress={() => {
                if (!email)
                  return alert(
                    "Entre ton email pour réinitialiser le mot de passe."
                  );
                supabase.auth.resetPasswordForEmail(email).then((res) => {
                  if (res.error) alert(res.error.message);
                  else
                    alert(
                      "Vérifie ton email pour réinitialiser le mot de passe."
                    );
                });
              }}
              disabled={loading}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f9fc" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  logoWrap: { alignItems: "center", marginBottom: 18 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e9f0ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },

  form: { marginTop: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f6fb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  input: { marginLeft: 10, fontSize: 15, color: "#111827", flex: 1 },

  button: {
    backgroundColor: "#2b6ef6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  row: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  smallText: { color: "#6b7280" },
  linkText: { color: "#2b6ef6", fontWeight: "600" },
  forgotText: { color: "#7b8fa6", textAlign: "center" },
});
