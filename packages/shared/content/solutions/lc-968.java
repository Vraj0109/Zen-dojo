class Solution {
    private int cameras;
    private int go(TreeNode n) {
        if (n == null) return 2;
        int l = go(n.left), r = go(n.right);
        if (l == 0 || r == 0) {
            cameras++;
            return 1;
        }
        if (l == 1 || r == 1) return 2;
        return 0;
    }
    public int minCameraCover(TreeNode root) {
        cameras = 0;
        if (go(root) == 0) cameras++;
        return cameras;
    }
}