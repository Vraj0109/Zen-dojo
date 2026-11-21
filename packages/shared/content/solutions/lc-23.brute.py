class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def mergeKLists(self, lists: list[list[int]]) -> object:
        vals = []
        for l in lists:
            for x in l:
                vals.append(x)
        vals.sort()
        dummy = ListNode(0)
        tail = dummy
        for x in vals:
            tail.next = ListNode(x)
            tail = tail.next
        return dummy.next
