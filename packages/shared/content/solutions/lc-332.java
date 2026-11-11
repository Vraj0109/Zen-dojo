import java.util.*;

class Solution {
    private Map<String, PriorityQueue<String>> g = new HashMap<>();
    private List<String> route = new ArrayList<>();
    private void visit(String a) {
        PriorityQueue<String> pq = g.get(a);
        while (pq != null && !pq.isEmpty()) {
            String next = pq.poll();
            visit(next);
        }
        route.add(a);
    }
    public String[] findItinerary(String[][] tickets) {
        g.clear();
        route.clear();
        for (String[] t : tickets) {
            g.computeIfAbsent(t[0], k -> new PriorityQueue<>()).offer(t[1]);
        }
        visit("JFK");
        Collections.reverse(route);
        return route.toArray(new String[route.size()]);
    }
}