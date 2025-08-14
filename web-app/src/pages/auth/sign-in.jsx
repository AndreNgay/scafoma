import React, {useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import useStore from "../../store/index.js";
import {useNavigate, Link} from "react-router-dom";
import api from "../../libs/apiCall.js";
import {toast} from "sonner";

const LoginSchema = z.object({
    email: z
        .string({required_error: "Email is required"})
        .email({message: "Invalid email address"}),
    password: z
        .string({required_error: "Password is required"})
        .min(6, {message: "Password must be at least 6 characters long"})
});

const SignIn = () => {
    const {user, setCredentials} = useStore((state) => state);

    const {register, handleSubmit, formState: {
            errors
        }} = useForm({resolver: zodResolver(LoginSchema)});

    const navigate = useNavigate();
    const [loading,
        setLoading] = useState(false);

    useEffect(() => {
        if (user) 
            navigate("/");
        }
    , [user, navigate]);

    const onSubmit = async(data) => {
        try {
            setLoading(true);
            const {data: res} = await api.post("/auth/sign-in", data);

            if (res.user) {
                toast.success(res.message || "Signed in successfully!");
                const userInfo = {
                    ...res.user,
                    token: res.token
                };
                localStorage.setItem("user", JSON.stringify(userInfo));
                setCredentials(userInfo);
                setTimeout(() => navigate("/overview"), 1500);
            } else {
                toast.error(res.message || "Something went wrong, please try again.");
            }
        } catch (error) {
            console.error("Sign-In Error:", error);
            toast.error(error.response
                ?.data
                    ?.message || "Sign-in failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            {...register("email")}
                            className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter your email"/> {errors.email && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type="password"
                            {...register("password")}
                            className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter your password"/> {errors.password && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition">
                        {loading
                            ? "Signing in..."
                            : "Sign In"}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-6">
                    <hr className="flex-grow border-gray-300"/>
                    <span className="mx-2 text-gray-500 text-sm">or</span>
                    <hr className="flex-grow border-gray-300"/>
                </div>

                {/* Social Login Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => console.log("Google Sign In")}
                        className="w-full flex items-center justify-center gap-2 py-2 border rounded-lg hover:bg-gray-50">
                        <img
                            src="https://www.svgrepo.com/show/475656/google-color.svg"
                            alt="Google"
                            className="w-5 h-5"/>
                        Sign in with Google
                    </button>

                    <button
                        onClick={() => console.log("Facebook Sign In")}
                        className="w-full flex items-center justify-center gap-2 py-2 border rounded-lg hover:bg-gray-50">
                        <img
                            src="https://www.svgrepo.com/show/448224/facebook.svg"
                            alt="Facebook"
                            className="w-5 h-5"/>
                        Sign in with Facebook
                    </button>
                </div>

                {/* Sign Up Link */}
                <p className="text-center text-sm text-gray-600 mt-6">
                    Don’t have an account?{" "}
                    <Link to="/sign-up" className="text-indigo-600 hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignIn;
