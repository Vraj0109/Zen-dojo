#include <vector>
#include <unordered_map>
#include <queue>

using namespace std;

class Solution {
public:
    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;
        unordered_map<Node*, Node*> copies;
        queue<Node*> q;

        copies[node] = new Node(node->val);
        q.push(node);

        while (!q.empty()) {
            Node* cur = q.front();
            q.pop();

            for (Node* neighbor : cur->neighbors) {
                if (!copies.count(neighbor)) {
                    copies[neighbor] = new Node(neighbor->val);
                    q.push(neighbor);
                }
                copies[cur]->neighbors.push_back(copies[neighbor]);
            }
        }
        return copies[node];
    }
};
