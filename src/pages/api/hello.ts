// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  name: string;
};
import { claimOpportunity } from '../../controllers/claimController';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  await claimOpportunity(req, res);
}

