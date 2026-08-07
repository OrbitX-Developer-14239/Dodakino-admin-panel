import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, name, type }) => {
  return (
    <Helmet>
      { /* Standard metadata tags */ }
      <title>{title}</title>
      <meta name='description' content={description} />
      
      { /* OpenGraph tags */ }
      <meta property="og:type" content={type || "website"} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      { /* You can also add dynamic og:image here if needed */ }

      { /* Twitter tags */ }
      <meta name="twitter:creator" content={name || "Doda Kino"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};

export default SEO;
