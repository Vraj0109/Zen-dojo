import java.util.ArrayList;
import java.util.List;

class Solution {
    private void inorder(TreeNode root, List<Integer> vals) {
        if (root == null) return;
        inorder(root.left, vals);
        vals.add(root.val);
        inorder(root.right, vals);
    }

    public boolean isValidBST(TreeNode root) {
        List<Integer> vals = new ArrayList<>();
        inorder(root, vals);
        for (int i = 1; i < vals.size(); i++) {
            if (vals.get(i) <= vals.get(i - 1)) return false;
        }
        return true;
    }
}
