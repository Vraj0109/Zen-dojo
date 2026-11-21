from typing import List

class Solution:
    def kthAncestor(self, n: int, parent: List[int], queries: List[List[int]]) -> List[int]:
        res = []
        for node, k in queries:
            while k > 0 and node != -1:
                node = parent[node]
                k -= 1
            res.append(node)
        return res
