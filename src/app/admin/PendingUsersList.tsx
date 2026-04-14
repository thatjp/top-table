import { approveUser } from "./actions";

type User = {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
};

export function PendingUsersList({ users }: { users: User[] }) {
  if (users.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No pending accounts.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Name</th>
            <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Email</th>
            <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Registered</th>
            <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300"> </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {users.map((u) => (
            <tr key={u.id} className="bg-white dark:bg-zinc-950">
              <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{u.displayName}</td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.email}</td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {u.createdAt.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <form action={approveUser}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Approve
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
