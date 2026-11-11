# verify: skip-stress
from typing import List, Optional
import heapq

class Solution:
    def mergeKLists(self, lists: List[List[int]]) -> Optional[ListNode]:
        pq = []
        for i, lst in enumerate(lists):
            if lst:
                heapq.heappush(pq, (lst[0], i, 0))
        dummy = ListNode(0)
        tail = dummy
        while pq:
            v, i, j = heapq.heappop(pq)
            tail.next = ListNode(v)
            tail = tail.next
            if j + 1 < len(lists[i]):
                heapq.heappush(pq, (lists[i][j + 1], i, j + 1))
        return dummy.next