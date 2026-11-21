import java.util.*;

class Solution {
    private boolean findPath(TreeNode root, int target, List<Integer> path) {
        if (root == null) return false;
        path.add(root.val);
        if (root.val == target) return true;
        if (findPath(root.left, target, path) || findPath(root.right, target, path)) {
            return true;
        }
        path.remove(path.size() - 1);
        return false;
    }

    public int lowestCommonAncestor(TreeNode root, int p, int q) {
        List<Integer> pathP = new ArrayList<>();
        List<Integer> pathQ = new ArrayList<>();
        findPath(root, p, pathP);
        findPath(root, q, pathQ);
        int lca = root.val;
        for (int i = 0; i < pathP.size() && i < pathQ.size(); i++) {
            if (pathP.get(i).equals(pathQ.get(i))) lca = pathP.get(i);
            else break;
        }
        return lca;
    }
}
