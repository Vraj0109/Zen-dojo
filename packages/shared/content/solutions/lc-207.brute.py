class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        g = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            g[b].append(a)
        state = [0] * numCourses

        def has_cycle(u: int) -> bool:
            state[u] = 1
            for v in g[u]:
                if state[v] == 1:
                    return True
                if state[v] == 0 and has_cycle(v):
                    return True
            state[u] = 2
            return False

        for i in range(numCourses):
            if state[i] == 0:
                if has_cycle(i):
                    return False
        return True
