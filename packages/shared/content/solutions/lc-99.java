class Solution {
    private TreeNode prev = null, first = null, second = null;
    private void walk(TreeNode n) {
        if (n == null) return;
        walk(n.left);
        if (prev != null && prev.val > n.val) {
            if (first == null) first = prev;
            second = n;
        }
        prev = n;
        walk(n.right);
    }
    public TreeNode recoverTree(TreeNode root) {
        prev = first = second = null;
        walk(root);
        if (first != null && second != null) {
            int tmp = first.val;
            first.val = second.val;
            second.val = tmp;
        }
        return root;
    }
}