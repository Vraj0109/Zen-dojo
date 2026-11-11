import java.util.*;

class Solution {
    public ListNode mergeKLists(int[][] lists) {
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        for (int i = 0; i < lists.length; i++) {
            if (lists[i].length > 0) {
                pq.offer(new int[]{lists[i][0], i, 0});
            }
        }
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int v = top[0], i = top[1], j = top[2];
            tail.next = new ListNode(v);
            tail = tail.next;
            if (j + 1 < lists[i].length) {
                pq.offer(new int[]{lists[i][j + 1], i, j + 1});
            }
        }
        return dummy.next;
    }
}