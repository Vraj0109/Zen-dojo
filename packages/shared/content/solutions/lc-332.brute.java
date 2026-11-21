import java.util.*;

class Solution {
    static class Edge {
        String to;
        boolean used;
        Edge(String to) {
            this.to = to;
            this.used = false;
        }
    }

    private boolean dfs(String u, Map<String, List<Edge>> g, int totalTickets, int usedTickets, List<String> route) {
        if (usedTickets == totalTickets) {
            return true;
        }

        if (!g.containsKey(u)) return false;

        for (Edge edge : g.get(u)) {
            if (!edge.used) {
                edge.used = true;
                route.add(edge.to);
                if (dfs(edge.to, g, totalTickets, usedTickets + 1, route)) {
                    return true;
                }
                route.remove(route.size() - 1);
                edge.used = false;
            }
        }
        return false;
    }

    public String[] findItinerary(String[][] tickets) {
        Map<String, List<Edge>> g = new HashMap<>();
        for (String[] t : tickets) {
            g.computeIfAbsent(t[0], k -> new ArrayList<>()).add(new Edge(t[1]));
        }

        for (List<Edge> edges : g.values()) {
            edges.sort(Comparator.comparing(e -> e.to));
        }

        List<String> route = new ArrayList<>();
        route.add("JFK");
        dfs("JFK", g, tickets.length, 0, route);
        return route.toArray(new String[0]);
    }
}
