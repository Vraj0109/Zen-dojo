import java.util.*;

class Solution {
    private void inorder(TreeNode node, List<TreeNode> nodes, List<Integer> vals) {
        if (node == null) return;
        inorder(node.left, nodes, vals);
        nodes.add(node);
        vals.add(node.val);
        inorder(node.right, nodes, vals);
    }

    public TreeNode recoverTree(TreeNode root) {
        List<TreeNode> nodes = new ArrayList<>();
        List<Integer> vals = new ArrayList<>();
        inorder(root, nodes, vals);
        Collections.sort(vals);
        for (int i = 0; i < nodes.size(); i++) {
            nodes.get(i).val = vals.get(i);
        }
        return root;
    }
}
