import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import type { Guidebook, Property } from '@/types';
import GuidebookView from './GuidebookView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const serviceClient = createServiceClient();
  const { data: property } = await serviceClient
    .from('properties')
    .select('name, city')
    .eq('id', params.id)
    .single();

  if (!property) return { title: 'Guidebook introuvable' };

  return {
    title: `${property.name} — Guide voyageur`,
    description: `Informations pratiques pour votre séjour à ${property.city}`,
  };
}

export default async function GuidebookPage({ params }: { params: { id: string } }) {
  const serviceClient = createServiceClient();

  const [propertyRes, guidebookRes] = await Promise.all([
    serviceClient.from('properties').select('*').eq('id', params.id).single(),
    serviceClient.from('guidebooks').select('*').eq('property_id', params.id).eq('is_published', true).single(),
  ]);

  if (!propertyRes.data || !guidebookRes.data) {
    notFound();
  }

  const property = propertyRes.data as Property;
  const guidebook = guidebookRes.data as Guidebook;

  return <GuidebookView property={property} guidebook={guidebook} />;
}
