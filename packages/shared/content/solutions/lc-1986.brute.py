class Solution:
    def minSessions(self, tasks: list[int], sessionTime: int) -> int:
        tasks.sort(reverse=True)
        min_sessions = len(tasks)
        sessions = []

        def backtrack(idx: int) -> None:
            nonlocal min_sessions
            if len(sessions) >= min_sessions:
                return
            if idx == len(tasks):
                min_sessions = min(min_sessions, len(sessions))
                return

            for i in range(len(sessions)):
                if sessions[i] + tasks[idx] <= sessionTime:
                    sessions[i] += tasks[idx]
                    backtrack(idx + 1)
                    sessions[i] -= tasks[idx]

            sessions.append(tasks[idx])
            backtrack(idx + 1)
            sessions.pop()

        backtrack(0)
        return min_sessions
