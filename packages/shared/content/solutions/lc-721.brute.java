import java.util.*;

class Solution {
    private void dfs(String email, Map<String, List<String>> adj, Set<String> visited, List<String> component) {
        visited.add(email);
        component.add(email);
        if (adj.containsKey(email)) {
            for (String neighbor : adj.get(email)) {
                if (!visited.contains(neighbor)) {
                    dfs(neighbor, adj, visited, component);
                }
            }
        }
    }

    public String[][] accountsMerge(String[][] accounts) {
        Map<String, List<String>> adj = new HashMap<>();
        Map<String, String> emailToName = new HashMap<>();

        for (String[] acc : accounts) {
            String name = acc[0];
            String firstEmail = acc[1];
            emailToName.put(firstEmail, name);
            for (int i = 1; i < acc.length; i++) {
                String email = acc[i];
                emailToName.put(email, name);
                adj.computeIfAbsent(firstEmail, k -> new ArrayList<>()).add(email);
                adj.computeIfAbsent(email, k -> new ArrayList<>()).add(firstEmail);
            }
        }

        Set<String> visited = new HashSet<>();
        List<String[]> result = new ArrayList<>();

        for (String email : emailToName.keySet()) {
            if (!visited.contains(email)) {
                List<String> component = new ArrayList<>();
                dfs(email, adj, visited, component);
                Collections.sort(component);
                String[] merged = new String[component.size() + 1];
                merged[0] = emailToName.get(email);
                for (int i = 0; i < component.size(); i++) {
                    merged[i + 1] = component.get(i);
                }
                result.add(merged);
            }
        }

        return result.toArray(new String[0][]);
    }
}
