#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    ListNode* mergeKLists(vector<vector<int>>& lists) {
        vector<int> vals;
        for (const auto& l : lists) {
            for (int x : l) vals.push_back(x);
        }
        sort(vals.begin(), vals.end());
        ListNode dummy(0);
        ListNode* tail = &dummy;
        for (int x : vals) {
            tail->next = new ListNode(x);
            tail = tail->next;
        }
        return dummy.next;
    }
};
