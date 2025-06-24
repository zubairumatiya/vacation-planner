import Header from "../pages/Header.tsx";
import { Outlet } from "react-router-dom";

const LayoutWithHeader = () => {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default LayoutWithHeader;
