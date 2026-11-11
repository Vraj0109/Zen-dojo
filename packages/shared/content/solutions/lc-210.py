# verify: skip-stress
from typing import List
import heapq

class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        g = [[] for _ in range(numCourses)]
        indeg = [0] * numCourses
        for course, pre in prerequisites:
            g[pre].append(course)
            indeg[course] += 1
        pq = [i for i in range(numCourses) if indeg[i] == 0]
        heapq.heapify(pq)
        order = []
        while pq:
            u = heapq.heappop(pq)
            order.append(u)
            for v in g[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    heapq.heappush(pq, v)
        if len(order) != numCourses:
            return []
        return order