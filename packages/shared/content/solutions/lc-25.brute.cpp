#include <vector>
#include <algorithm>

class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        std::vector<int> vals;
        ListNode* curr = head;
        while (curr) {
            vals.push_back(curr->val);
            curr = curr->next;
        }
        int n = vals.size();
        for (int i = 0; i + k <= n; i += k) {
            std::reverse(vals.begin() + i, vals.begin() + i + k);
        }
        curr = head;
        for (int v : vals) {
            curr->val = v;
            curr = curr->next;
        }
        return head;
    }
};
