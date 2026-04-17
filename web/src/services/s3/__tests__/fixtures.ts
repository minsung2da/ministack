/**
 * Shared S3 XML response fixtures for MSW handlers and parser tests.
 * Every response uses the `xmlns="http://s3.amazonaws.com/doc/2006-03-01/"` namespace,
 * matching the backend (ministack/services/s3.py).
 */
export const S3_FIXTURES = {
  listBucketsEmpty: `<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Owner>
    <ID>owner-id</ID>
    <DisplayName>ministack</DisplayName>
  </Owner>
  <Buckets></Buckets>
</ListAllMyBucketsResult>`,

  listBucketsTwo: `<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Owner>
    <ID>owner-id</ID>
    <DisplayName>ministack</DisplayName>
  </Owner>
  <Buckets>
    <Bucket>
      <Name>my-bucket</Name>
      <CreationDate>2026-04-12T10:30:00Z</CreationDate>
    </Bucket>
    <Bucket>
      <Name>other-bucket</Name>
      <CreationDate>2026-04-15T08:12:00Z</CreationDate>
    </Bucket>
  </Buckets>
</ListAllMyBucketsResult>`,

  listObjectsRoot: `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>my-bucket</Name>
  <Prefix></Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>50</MaxKeys>
  <KeyCount>4</KeyCount>
  <IsTruncated>false</IsTruncated>
  <CommonPrefixes>
    <Prefix>photos/</Prefix>
  </CommonPrefixes>
  <CommonPrefixes>
    <Prefix>docs/</Prefix>
  </CommonPrefixes>
  <Contents>
    <Key>readme.txt</Key>
    <LastModified>2026-04-12T10:30:00Z</LastModified>
    <ETag>"etag-readme"</ETag>
    <Size>128</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>index.html</Key>
    <LastModified>2026-04-13T08:12:00Z</LastModified>
    <ETag>"etag-index"</ETag>
    <Size>2048</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`,

  listObjectsTruncated: `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>my-bucket</Name>
  <Prefix></Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>50</MaxKeys>
  <KeyCount>50</KeyCount>
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>next-token-abc</NextContinuationToken>
  <Contents>
    <Key>page1.txt</Key>
    <LastModified>2026-04-12T10:30:00Z</LastModified>
    <ETag>"etag-page1"</ETag>
    <Size>4096</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`,

  listObjectsNested: `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>my-bucket</Name>
  <Prefix>photos/</Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>50</MaxKeys>
  <KeyCount>2</KeyCount>
  <IsTruncated>false</IsTruncated>
  <CommonPrefixes>
    <Prefix>photos/2026/</Prefix>
  </CommonPrefixes>
  <Contents>
    <Key>photos/cat.jpg</Key>
    <LastModified>2026-04-12T10:30:00Z</LastModified>
    <ETag>"abc123"</ETag>
    <Size>1234567</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`,

  taggingEmpty: `<?xml version="1.0" encoding="UTF-8"?>
<Tagging xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <TagSet></TagSet>
</Tagging>`,

  taggingWithTags: `<?xml version="1.0" encoding="UTF-8"?>
<Tagging xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <TagSet>
    <Tag>
      <Key>env</Key>
      <Value>prod</Value>
    </Tag>
    <Tag>
      <Key>owner</Key>
      <Value>alice</Value>
    </Tag>
  </TagSet>
</Tagging>`,

  deleteObjectsSuccess: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Deleted>
    <Key>photos/cat.jpg</Key>
  </Deleted>
  <Deleted>
    <Key>photos/dog.jpg</Key>
  </Deleted>
</DeleteResult>`,

  deleteObjectsPartial: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Deleted>
    <Key>photos/cat.jpg</Key>
  </Deleted>
  <Error>
    <Key>photos/missing.jpg</Key>
    <Code>NoSuchKey</Code>
    <Message>The specified key does not exist.</Message>
  </Error>
</DeleteResult>`,

  errorBucketNotEmpty: `<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>BucketNotEmpty</Code>
  <Message>The bucket you tried to delete is not empty</Message>
</Error>`,
}
