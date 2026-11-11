class Solution {
    private int[] go(TreeNode n) {
        if (n == null) return new int[]{0, 0};
        int[] l = go(n.left), r = go(n.right);
        int robbed = n.val + l[1] + r[1];
        int skipped = Math.max(l[0], l[1]) + Math.max(r[0], r[1]);
        return new int[]{robbed, skipped};
    }

    public int rob(TreeNode root) {
        int[] p = go(root);
        return Math.max(p[0], p[1]);
    }
}
