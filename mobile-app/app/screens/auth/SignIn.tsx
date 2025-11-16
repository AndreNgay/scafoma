import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import useStore from "../../store";
import api from "../../libs/apiCall"; // axios instance
import { useToast } from "../../contexts/ToastContext";

const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

type LoginForm = z.infer<typeof LoginSchema>;
type Props = NativeStackScreenProps<any, "SignIn">;

const SignIn: React.FC<Props> = ({ navigation }) => {
  const { setCredentials } = useStore((state) => state);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();


  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" }, 
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      const res = await api.post("/auth/sign-in", data);

      if (res.data.user) {
        const userInfo = { ...res.data.user, token: res.data.token };
        await setCredentials(userInfo); 
      } else {
        showToast("error", res.data.message || "Something went wrong");
      }
    } catch (error: any) {
      console.error("Sign-In Error:", error);
      showToast("error", error.response?.data?.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {/* Email Field */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

        {/* Password Field */}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
        {/* Forgot Password Link */}
<TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
  <Text style={[styles.link, { marginTop: 5 }]}>
    <Text style={styles.linkHighlight}>Forgot your password?</Text>
  </Text>
</TouchableOpacity>

        {/* Sign Up Link */}
        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text style={styles.link}>
            Don’t have an account? <Text style={styles.linkHighlight}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#A40C2D",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 18,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#A40C2D",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    color: "red",
    marginBottom: 8,
  },
  link: {
    textAlign: "center",
    marginTop: 10,
    color: "#374151",
  },
  linkHighlight: {
    color: "#A40C2D",
    fontWeight: "600",
  },
});
