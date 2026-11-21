#include <vector>
#include <algorithm>

class Solution {
public:
    ListNode* reverseBetween(ListNode* head, int left, int right) {
        std::vector<int> vals;
        ListNode* curr = head;
        while (curr) {
            vals.push_back(curr->val);
            curr = curr->next;
        }
        std::reverse(vals.begin() + left - 1, vals.begin() + right);
        curr = head;
        for (int v : vals) {
            curr->val = v;
            curr = curr->next;
        }
        return head;
    }
};
