import java.util.*;

class Codec {
    // Encodes a tree to a single string.
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        buildString(root, sb);
        return sb.toString();
    }

    private void buildString(TreeNode root, StringBuilder sb) {
        if (root == null) {
            sb.append("#");
            return;
        }
        sb.append(root.val).append(",");
        buildString(root.left, sb);
        sb.append(",");
        buildString(root.right, sb);
    }

    // Decodes your encoded data to tree.
    public TreeNode deserialize(String data) {
        String[] tokens = data.split(",");
        int[] ptr = new int[]{0};
        return decode(tokens, ptr);
    }

    private TreeNode decode(String[] tokens, int[] ptr) {
        if (ptr[0] >= tokens.length) return null;
        String item = tokens[ptr[0]++];
        if (item.equals("#")) return null;
        TreeNode node = new TreeNode(Integer.parseInt(item));
        node.left = decode(tokens, ptr);
        node.right = decode(tokens, ptr);
        return node;
    }
}
