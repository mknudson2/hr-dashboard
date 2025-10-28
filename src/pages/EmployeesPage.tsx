import { useState } from "react";
import EmployeeDrawer from "../components/EmployeeDrawer";

const employees = [
    {
        id: 1,
        name: "Gunnar Hjalmarson",
        status: "Active",
        role: "Engineer",
        hireDate: "2022-04-11",
        totalHours: 1820,
        ptoUsed: 32,
        terminationRisk: "Low",
    },
    {
        id: 2,
        name: "Audr Djupaudga",
        status: "Terminated",
        role: "Analyst",
        hireDate: "2023-03-02",
        totalHours: 920,
        ptoUsed: 8,
        terminationRisk: "High",
    },
    {
        id: 3,
        name: "Orren Thorsteinsson",
        status: "Active",
        role: "HR Specialist",
        hireDate: "2021-10-17",
        totalHours: 2450,
        ptoUsed: 64,
        terminationRisk: "Medium",
    },
    {
        id: 4,
        name: "Freydis Eiriksdottir",
        status: "Active",
        role: "Project Manager",
        hireDate: "2020-05-24",
        totalHours: 3980,
        ptoUsed: 88,
        terminationRisk: "Low",
    },
];

export default function EmployeesPage() {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<any | null>(null);

    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="p-6 relative min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Page Header */}
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Employees
            </h2>

            {/* Search Input */}
            <input
                type="text"
                placeholder="Search employees..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border dark:border-gray-700 rounded-lg px-4 py-2 mb-5 w-full max-w-md
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   placeholder:text-gray-400 dark:placeholder:text-gray-500
                   focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {/* Employee Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full bg-white dark:bg-gray-800">
                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((emp) => (
                            <tr
                                key={emp.id}
                                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                                onClick={() => setSelected(emp)}
                            >
                                <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                                    {emp.name}
                                </td>
                                <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                    {emp.role}
                                </td>
                                <td className="px-6 py-3">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${emp.status === "Active"
                                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                            }`}
                                    >
                                        {emp.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Drawer */}
            <EmployeeDrawer employee={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
