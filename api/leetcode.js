// Vercel serverless function: same-origin proxy to LeetCode's GraphQL API.
// leetcode.com/graphql does not send CORS headers for third-party origins, so the browser can't
// call it directly — this function runs server-side (no CORS involved) and the frontend calls it
// as a same-origin endpoint instead. See src/api/leetcode.js for the client side.

const SEARCH_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
      total: totalNum
      questions: data {
        title
        titleSlug
        difficulty
        paidOnly: isPaidOnly
        topicTags { name }
      }
    }
  }
`;

const DETAIL_QUERY = `
  query questionDetail($slug: String!) {
    question(titleSlug: $slug) { title titleSlug difficulty topicTags { name } }
  }
`;

export default async function handler(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  if (req.query.action === 'detail') {
    const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
    try {
      const r = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json', referer: 'https://leetcode.com' },
        body: JSON.stringify({ query: DETAIL_QUERY, variables: { slug } }),
      });
      const json = await r.json();
      const question = json?.data?.question;
      if (!question) throw new Error('Problem not found');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({
        title: question.title,
        titleSlug: question.titleSlug,
        difficulty: question.difficulty,
        tags: question.topicTags.map((t) => t.name),
      });
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Failed to reach LeetCode' });
    }
  }

  try {
    const r = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', referer: 'https://leetcode.com' },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { categorySlug: '', limit, skip: 0, filters: { searchKeywords: q } },
      }),
    });
    if (!r.ok) throw new Error(`LeetCode responded ${r.status}`);
    const json = await r.json();
    const list = json?.data?.problemsetQuestionList;
    if (!list) throw new Error('Unexpected response shape from LeetCode');

    const questions = list.questions.filter((x) => !x.paidOnly).map((x) => ({
      title: x.title,
      titleSlug: x.titleSlug,
      difficulty: x.difficulty,
      tags: x.topicTags.map((t) => t.name),
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ total: list.total, questions });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to reach LeetCode' });
  }
}
