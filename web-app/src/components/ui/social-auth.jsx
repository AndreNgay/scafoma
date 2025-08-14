import {GoogleAuthProvider, FacebookAuthProvider, signInWithPopup} from "firebase/auth";
import React, {useEffect, useState} from "react";
import {useAuthState} from "react-firebase-hooks/auth";
import {toast} from "sonner";
import {useNavigate} from "react-router-dom";
import useStore from "../../store/index.js";
import {Button} from "./button.tsx";
import api from "../../libs/apiCall.js";
import {app, auth} from "../../libs/firebaseConfig.js";
import {FcGoogle} from "react-icons/fc";
import {FaFacebook} from "react-icons/fa";

export const SocialAuth = ({isLoading, setLoading}) => {
    const [user] = useAuthState(auth);
    const [selectedProvider,
        setSelectedProvider] = useState("google");
    const {setCredentials} = useStore((state) => state);
    const navigate = useNavigate();

    // social-auth.jsx
    const [justSignedIn,
        setJustSignedIn] = useState(false);

    const signInWithGoogle = async() => {
        const provider = new GoogleAuthProvider();
        setSelectedProvider("google");
        try {
            await signInWithPopup(auth, provider);
            setJustSignedIn(true); // mark that this session initiated the sign-in
        } catch (error) {
            console.error("Google Sign-In Error:", error);
        }
    };

    const signInWithFacebook = async() => {
        const provider = new FacebookAuthProvider();
        setSelectedProvider("facebook");
        try {
            await signInWithPopup(auth, provider);
            setJustSignedIn(true);
        } catch (error) {
            console.error("Facebook Sign-In Error:", error);
        }
    };

    useEffect(() => {
        const saveUserToDb = async() => {
            try {
                const [first_name,
                    ...lastParts] = (user.displayName || "").split(" ");
                const last_name = lastParts.join(" ");

                const userData = {
                    first_name,
                    last_name,
                    email: user.email,
                    provider: selectedProvider,
                    uid: user.uid
                };

                setLoading(true);
                const {data: res} = await api.post("/auth/sign-in", userData);
                console.log(res);

                if (res
                    ?.user) {
                    toast.success(res
                        ?.message);
                    const userInfo = {
                        ...res
                            ?.user,
                        token: res
                            ?.token
                    };
                    localStorage.setItem("user", JSON.stringify(userInfo));
                    setCredentials(userInfo);
                    navigate("/overview");
                }
            } catch (error) {
                console.error("Error saving user to database:", error);
                toast.error("Failed to save user data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        if (user && justSignedIn) {
            saveUserToDb();
            setJustSignedIn(false); // reset after saving
        }
    }, [
        user,
        justSignedIn,
        selectedProvider,
        setLoading,
        navigate,
        setCredentials
    ]);

    return (
        <div className="flex space-x-2 w-full">
            <Button
                onClick={signInWithGoogle}
                disabled={isLoading}
                type="button"
                className="flex-1">
                <FcGoogle className="mr-2"/>
                Google
            </Button>
            <Button
                onClick={signInWithFacebook}
                disabled={isLoading}
                type="button"
                className="flex-1 text-blue-600">
                <FaFacebook className="mr-2"/>
                Facebook
            </Button>
        </div>
    );
};
