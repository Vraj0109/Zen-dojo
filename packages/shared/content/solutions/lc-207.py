# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        g = [[] for _ in range(numCourses)]
        indeg = [0] * numCourses
        for course, pre in prerequisites:
            g[pre].append(course)
            indeg[course] += 1
        q = deque(i for i in range(numCourses) if indeg[i] == 0)
        taken = 0
        while q:
            u = q.popleft()
            taken += 1
            for v in g[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
        return taken == numCourses