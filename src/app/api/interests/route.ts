import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const interests = await prisma.interest.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(interests);
  } catch (error) {
    console.error('Interests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
