import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import useStore from "../../store/index.js";
import { Button } from "../ui/button.tsx";
import api from "../../libs/apiCall.js";
import { auth } from "../../libs/firebaseConfig.js"; // ✅ Added



export const SocialAuth = ({ isLoading, setLoading }) => {
  const [user] = useAuthState(auth);
  const [selectedProvider, setSelectedProvider] = useState("google");
  const { setCredentials } = useStore((state) => state);
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setSelectedProvider("google");
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  useEffect(() => {
    const saveUserToDb = async () => {
      try {
        const userData = {
          name: user.displayName,
          email: user.email,
          provider: selectedProvider,
          uid: user.uid,
        };

        setLoading(true);
        const { data: res } = await api.post("/auth/sign-in", userData);
        console.log(res);

        if (res?.user) {
          toast.success(res?.message);
          const userInfo = { ...res?.user, token: res?.token };
          localStorage.setItem("user", JSON.stringify(userInfo));
          setCredentials(userInfo);

          setTimeout(() => {
            navigate("/overview");
          }, 1500);
        }
      } catch (error) {
        console.error("Error saving user to database:", error);
        toast.error("Failed to save user data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      saveUserToDb();
    }
  }, [user, selectedProvider, setLoading, navigate, setCredentials]);

  return (
    <div>
      <Button
        onClick={signInWithGoogle}
        disabled={isLoading}
        type="button"
      >
        Continue with Google
      </Button>
    </div>
  );
};
