import { Navigate, Outlet } from "react-router-dom";
import { isAuthed } from "@/lib/auth";

const RequireAuth = () => {
  return isAuthed() ? <Outlet /> : <Navigate to="/" replace />;
};

export default RequireAuth;
