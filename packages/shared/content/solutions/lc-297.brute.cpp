#include <string>
#include <vector>
#include <sstream>
#include <queue>

using namespace std;

class Codec {
public:
    Codec() {}

    string serialize(TreeNode* root) {
        if (!root) return "";
        string res = "";
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            TreeNode* cur = q.front();
            q.pop();
            if (!cur) {
                res += "#,";
            } else {
                res += to_string(cur->val) + ",";
                q.push(cur->left);
                q.push(cur->right);
            }
        }
        return res;
    }

    TreeNode* deserialize(string data) {
        if (data.empty()) return nullptr;
        stringstream ss(data);
        string item;
        getline(ss, item, ',');
        if (item == "#" || item.empty()) return nullptr;

        TreeNode* root = new TreeNode(stoi(item));
        queue<TreeNode*> q;
        q.push(root);

        while (!q.empty()) {
            TreeNode* cur = q.front();
            q.pop();

            if (!getline(ss, item, ',')) break;
            if (item != "#") {
                cur->left = new TreeNode(stoi(item));
                q.push(cur->left);
            }

            if (!getline(ss, item, ',')) break;
            if (item != "#") {
                cur->right = new TreeNode(stoi(item));
                q.push(cur->right);
            }
        }
        return root;
    }
};
