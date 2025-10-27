import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex">
            <Sidebar />
            <main className="flex-1 flex flex-col">
                <Header />
                <div className="p-6 bg-gray-50 min-h-screen">{children}</div>
            </main>
        </div>
    );
}
