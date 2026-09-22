import { Navigate, Outlet } from "react-router-dom";
import { isAuthed, isAdmin } from "@/lib/auth";

/** Not logged in → send to the admin login screen.
 *  Logged in but not an admin (a normal player) → send home, never show any
 *  admin chrome. Admin → render the nested admin routes. */
const RequireAdmin = () => {
  if (!isAuthed()) return <Navigate to="/admin/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default RequireAdmin;
