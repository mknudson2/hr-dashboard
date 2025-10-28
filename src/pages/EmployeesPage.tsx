import { useState } from "react";

const employees = [
    { id: 1, name: "Gunnar Hjalmarson", status: "Active" },
    { id: 2, name: "Audr Djupaudga", status: "Terminated" },
];

export default function EmployeesPage() {
    const [query, setQuery] = useState("");

    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Employees
            </h2>

            <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border dark:border-gray-600 rounded-md px-3 py-2 mb-4 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />

            <table className="w-full bg-white dark:bg-gray-800 rounded-md shadow border dark:border-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                </thead>

                <tbody>
                    {filtered.map((emp) => (
                        <tr key={emp.id} className="border-t dark:border-gray-700">
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                {emp.name}
                            </td>
                            <td className="px-4 py-2">
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${emp.status === "Active"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
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
    );
}
