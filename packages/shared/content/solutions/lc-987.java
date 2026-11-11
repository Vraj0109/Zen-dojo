import java.util.*;

class Solution {
    private static class Item implements Comparable<Item> {
        int col, row, val;
        Item(int c, int r, int v) { col = c; row = r; val = v; }
        public int compareTo(Item o) {
            if (this.col != o.col) return Integer.compare(this.col, o.col);
            if (this.row != o.row) return Integer.compare(this.row, o.row);
            return Integer.compare(this.val, o.val);
        }
    }
    private void dfs(TreeNode n, int row, int col, List<Item> items) {
        if (n == null) return;
        items.add(new Item(col, row, n.val));
        dfs(n.left, row + 1, col - 1, items);
        dfs(n.right, row + 1, col + 1, items);
    }
    public int[][] verticalTraversal(TreeNode root) {
        List<Item> items = new ArrayList<>();
        dfs(root, 0, 0, items);
        Collections.sort(items);
        List<List<Integer>> out = new ArrayList<>();
        int prev = Integer.MIN_VALUE;
        for (Item it : items) {
            if (it.col != prev) {
                out.add(new ArrayList<>());
                prev = it.col;
            }
            out.get(out.size() - 1).add(it.val);
        }
        int[][] res = new int[out.size()][];
        for (int i = 0; i < out.size(); i++) {
            List<Integer> list = out.get(i);
            res[i] = new int[list.size()];
            for (int j = 0; j < list.size(); j++) res[i][j] = list.get(j);
        }
        return res;
    }
}