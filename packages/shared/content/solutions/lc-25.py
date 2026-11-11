class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        group_prev = dummy
        while True:
            kth = group_prev
            for _ in range(k):
                kth = kth.next
                if not kth:
                    return dummy.next
            group_next = kth.next
            prev, cur = group_next, group_prev.next
            while cur != group_next:
                nx = cur.next
                cur.next = prev
                prev = cur
                cur = nx
            old_first = group_prev.next
            group_prev.next = kth
            group_prev = old_first
        return dummy.next
