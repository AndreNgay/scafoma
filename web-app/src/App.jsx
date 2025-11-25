import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import SignIn from "./pages/auth/sign-in"
import SignUp from "./pages/auth/sign-up"
import Settings from "./pages/settings"
import useStore from "./store"
import { setAuthToken } from "./libs/apiCall"
import { Toaster } from "sonner"
import { Navbar } from "./components/navbar"
import { Cafeterias } from "./pages/cafeterias"
import { Users } from "./pages/users"
import { Concessions } from "./pages/concessions"
import { ConcessionsOverview } from "./pages/concessions-overview"
import { Profile } from "./pages/profile"
import ForgotPassword from "./pages/auth/forgot-password"


const RootLayout = () => {
  const {user} = useStore((state) => state)
  setAuthToken(user?.token || "")
  return !user ? (
    <Navigate to="/sign-in" replace={true}/>

  ) : (
    <>
    <Navbar />
    <div className="min-h-[cal(h-screen-100px)]">
      <Outlet />
    </div>
    </>
  )
    
  
}

function App() {
  return(
    <main>
      <div className="w-full min-h-screen px-6 bg-gray-100 md:px-20">
        <Routes>
          <Route element={<RootLayout/>}>
            <Route path="/" element={<Navigate to="/cafeterias" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cafeterias" element={<Cafeterias />} />
            <Route path="/concessions" element={<ConcessionsOverview />} />
            <Route path="/concessions/:cafeteriaId" element={<Concessions />} />

            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </div>

      <Toaster richColors position="top-center" />
    </main>
  )
}

export default App;
