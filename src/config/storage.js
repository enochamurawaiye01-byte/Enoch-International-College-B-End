const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const crypto = require("crypto");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mediaBucket = process.env.SUPABASE_MEDIA_BUCKET || "school-media";
const documentBucket = process.env.SUPABASE_DOCUMENT_BUCKET || "school-documents";

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const requireStorage = () => { if (!supabase) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file storage."); return supabase; };

const ensureBucket = async (name, isPublic) => {
	const client = requireStorage();
	const { data: buckets, error: listError } = await client.storage.listBuckets();
	if (listError) throw new Error(`Unable to inspect Supabase Storage buckets: ${listError.message}`);
	const bucket = buckets.find((item) => item.name === name);
	if (!bucket) {
		const { error } = await client.storage.createBucket(name, { public: isPublic, fileSizeLimit: Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 5242880 });
		if (error && !/already exists/i.test(error.message)) throw new Error(`Unable to create Supabase Storage bucket ${name}: ${error.message}`);
	} else if (bucket.public !== isPublic) {
		const { error } = await client.storage.updateBucket(name, { public: isPublic, fileSizeLimit: Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 5242880 });
		if (error) throw new Error(`Unable to configure Supabase Storage bucket ${name}: ${error.message}`);
	}
};

const initializeStorage = async () => {
	await ensureBucket(mediaBucket, true);
	await ensureBucket(documentBucket, false);
};

const createStorageReference = (bucket, objectPath) => `supabase://${bucket}/${objectPath}`;

const parseStorageReference = (value) => {
	if (typeof value !== "string" || !value.startsWith("supabase://")) return null;
	const reference = value.slice("supabase://".length);
	const separatorIndex = reference.indexOf("/");
	if (separatorIndex < 1 || separatorIndex === reference.length - 1) return null;
	return { bucket: reference.slice(0, separatorIndex), path: reference.slice(separatorIndex + 1) };
};

const uploadFile = async ({ file, folder, privateFile = false }) => {
	const client = requireStorage();
	const bucket = privateFile ? documentBucket : mediaBucket;
	const objectPath = `${folder}/${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
	const { error } = await client.storage.from(bucket).upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
	if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
	if (!privateFile) return { bucket, path: objectPath, url: client.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl };
	return { bucket, path: objectPath, storageReference: createStorageReference(bucket, objectPath) };
};

const getFileUrl = async (value) => {
	const reference = parseStorageReference(value);
	if (!reference) return value;
	const { data, error } = await requireStorage().storage.from(reference.bucket).createSignedUrl(reference.path, Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS) || 3600);
	if (error) throw new Error(`Supabase Storage signed URL failed: ${error.message}`);
	return data.signedUrl;
};

const removeFile = async (bucket, objectPath) => {
	const { error } = await requireStorage().storage.from(bucket).remove([objectPath]);
	if (error) throw new Error(`Supabase Storage delete failed: ${error.message}`);
};

const removeStoredFile = async (value) => {
	const reference = parseStorageReference(value);
	if (reference) await removeFile(reference.bucket, reference.path);
};

module.exports = { supabase, mediaBucket, documentBucket, initializeStorage, uploadFile, getFileUrl, removeStoredFile, removeFile };
