import java.util.*;

class Solution {
    private void dfs(TreeNode node, int r, int c, Map<Integer, Map<Integer, List<Integer>>> grid) {
        if (node == null) return;
        grid.computeIfAbsent(c, k -> new TreeMap<>())
            .computeIfAbsent(r, k -> new ArrayList<>())
            .add(node.val);
        dfs(node.left, r + 1, c - 1, grid);
        dfs(node.right, r + 1, c + 1, grid);
    }

    public int[][] verticalTraversal(TreeNode root) {
        Map<Integer, Map<Integer, List<Integer>>> grid = new TreeMap<>();
        dfs(root, 0, 0, grid);
        List<int[]> res = new ArrayList<>();
        for (Map<Integer, List<Integer>> rows : grid.values()) {
            List<Integer> colVals = new ArrayList<>();
            for (List<Integer> vals : rows.values()) {
                Collections.sort(vals);
                colVals.addAll(vals);
            }
            int[] arr = new int[colVals.size()];
            for (int i = 0; i < colVals.size(); i++) arr[i] = colVals.get(i);
            res.add(arr);
        }
        int[][] out = new int[res.size()][];
        for (int i = 0; i < res.size(); i++) out[i] = res.get(i);
        return out;
    }
}
