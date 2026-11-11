# verify: skip-stress
from typing import Optional

class Solution:
    def reorderList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if not head or not head.next:
            return head
        slow = fast = head
        while fast.next and fast.next.next:
            slow = slow.next
            fast = fast.next.next
        prev = None
        cur = slow.next
        slow.next = None
        while cur:
            nx = cur.next
            cur.next = prev
            prev = cur
            cur = nx
        a, b = head, prev
        while b:
            an, bn = a.next, b.next
            a.next = b
            b.next = an
            a = an
            b = bn
        return head