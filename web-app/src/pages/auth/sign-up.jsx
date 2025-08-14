import React, {useState} from "react";
import {useForm} from "react-hook-form";
import * as z from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Link} from "react-router-dom";
import {toast} from "sonner";
import {useNavigate} from "react-router-dom";
import api from "../../libs/apiCall.js";
import useStore from "../../store/index.js";
import {SocialAuth} from "../../components/ui/social-auth.jsx";

const RegisterSchema = z.object({
    first_name: z
        .string({required_error: "First name is required"})
        .min(2, {message: "First name must be at least 2 characters"}),
    last_name: z
        .string({required_error: "Last name is required"})
        .min(2, {message: "Last name must be at least 2 characters"}),
    email: z
        .string({required_error: "Email is required"})
        .email({message: "Invalid email address"}),
    password: z
        .string({required_error: "Password is required"})
        .min(6, {message: "Password must be at least 6 characters long"})
});

const SignUp = () => {
    const [isLoading,
        setLoading] = useState(false);

    const {register, handleSubmit, formState: {
            errors
        }} = useForm({resolver: zodResolver(RegisterSchema)});

    const navigate = useNavigate();
    const {setCredentials} = useStore((state) => state);

    const onSubmit = async(data) => {
        try {
            setLoading(true);

            const {data: res} = await api.post("/auth/sign-up", data);

            if (res
                ?.user) {
                toast.success(res
                    ?.message || "Account created successfully!");
                setTimeout(() => {
                    navigate("/sign-in");
                }, 1500);

            } else {
                toast.error(res
                    ?.message || "Something went wrong, please try again.");
            }
        } catch (error) {
            console.error("Sign-Up Error:", error);
            toast.error(error.response
                ?.data
                    ?.message || "Sign-up failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* First Name */}
                    <div>
                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                            First Name
                        </label>
                        <input
                            disabled={isLoading}
                            id="first_name"
                            type="text"
                            placeholder="John"
                            {...register("first_name")}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/> {errors.first_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div>
                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                            Last Name
                        </label>
                        <input
                            disabled={isLoading}
                            id="last_name"
                            type="text"
                            placeholder="Smith"
                            {...register("last_name")}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/> {errors.last_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            disabled={isLoading}
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            {...register("email")}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/> {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            disabled={isLoading}
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            {...register("password")}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/> {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white rounded-md py-2 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {isLoading
                            ? "Signing Up..."
                            : "Sign Up"}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center my-4">
                        <hr className="flex-1 border-gray-300"/>
                        <span className="px-2 text-sm text-gray-500">or</span>
                        <hr className="flex-1 border-gray-300"/>
                    </div>

                    {/* Social Auth Buttons */}
                    <div className="flex space-x-2">
                        <SocialAuth isLoading={isLoading} setLoading={setLoading}/>
                    </div>

                    {/* Already Have Account */}
                    <p className="mt-4 text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link to="/sign-in" className="text-blue-600 hover:underline font-medium">
                            Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default SignUp;
