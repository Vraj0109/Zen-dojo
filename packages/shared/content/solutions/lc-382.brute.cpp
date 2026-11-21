#include <vector>
#include <cstdlib>

using namespace std;

class Solution {
    vector<int> vals;

public:
    Solution(ListNode* head) {
        ListNode* cur = head;
        while (cur) {
            vals.push_back(cur->val);
            cur = cur->next;
        }
    }

    int getRandom() {
        return vals[rand() % vals.size()];
    }
};
