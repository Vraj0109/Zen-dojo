import java.util.*;

class Solution {
    private int[] par;
    private int find(int x) {
        return par[x] == x ? x : (par[x] = find(par[x]));
    }
    public String[][] accountsMerge(String[][] accounts) {
        Map<String, Integer> id = new HashMap<>();
        List<String> emails = new ArrayList<>();
        List<String> owner = new ArrayList<>();
        for (String[] a : accounts) {
            for (int i = 1; i < a.length; i++) {
                if (!id.containsKey(a[i])) {
                    id.put(a[i], emails.size());
                    emails.add(a[i]);
                    owner.add(a[0]);
                }
            }
        }
        par = new int[emails.size()];
        for (int i = 0; i < par.length; i++) par[i] = i;
        for (String[] a : accounts) {
            for (int i = 2; i < a.length; i++) {
                par[find(id.get(a[i]))] = find(id.get(a[1]));
            }
        }
        Map<Integer, List<String>> groups = new HashMap<>();
        for (int i = 0; i < emails.size(); i++) {
            int root = find(i);
            groups.computeIfAbsent(root, k -> new ArrayList<>()).add(emails.get(i));
        }
        List<String[]> out = new ArrayList<>();
        for (Map.Entry<Integer, List<String>> entry : groups.entrySet()) {
            List<String> list = entry.getValue();
            Collections.sort(list);
            list.add(0, owner.get(entry.getKey()));
            out.add(list.toArray(new String[list.size()]));
        }
        return out.toArray(new String[out.size()][]);
    }
}