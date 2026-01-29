import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

const faqs = [
  {
    question: 'What file formats do you support?',
    answer: 'We support CSV files exported from any payroll system. Your files should include employee IDs, gross pay, deductions, and net pay columns. We also support optional columns like employee name, department, hours worked, and employment status.',
  },
  {
    question: 'How does the free trial work?',
    answer: 'Your 14-day free trial gives you full access to all features with no limitations. No credit card is required to start. At the end of the trial, you can choose a paid plan to continue or your account will be paused.',
  },
  {
    question: 'Is my payroll data secure?',
    answer: 'Yes, security is our top priority. All data is encrypted in transit and at rest. We use Supabase for secure data storage with row-level security. We never share your data with third parties and you can delete your data at any time.',
  },
  {
    question: 'What happens after the trial ends?',
    answer: 'At the end of your trial, you can choose a paid plan to continue using the service. If you don\'t subscribe, your account will be paused but your data will be retained for 30 days in case you decide to return.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. Your access continues until the end of your billing period.',
  },
  {
    question: 'Do you offer team plans?',
    answer: 'Yes, we offer team plans with multiple user seats, role-based access control, and centralized billing. Contact us for enterprise pricing with custom features and dedicated support.',
  },
];

export function FAQ() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-lg">
            Got questions? We've got answers.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white rounded-lg border px-6"
            >
              <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
