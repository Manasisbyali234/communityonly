
export default function CreateMatrimonyProfile() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: myProfile, isLoading: profileLoading } = useMyMatrimonyProfileQuery();
  const createMutation = useCreateMatrimonyProfileMutation();
  const updateMutation = useUpdateMatrimonyProfileMutation();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [consents, setConsents] = useState({ accurate: false, terms: false, privacy: false, display: false });
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!myProfile?.id) return;
    setPhotos(myProfile.photos ?? []);
    setForm({
      displayName: myProfile.displayName ?? '',
      gender: (myProfile.gender ?? '') as Gender | '',
      dateOfBirth: myProfile.dateOfBirth ? myProfile.dateOfBirth.toString().slice(0, 10) : '',
      height: myProfile.height ?? '',
      maritalStatus: (myProfile.maritalStatus ?? '') as MaritalStatus | '',
      bloodGroup: myProfile.bloodGroup ?? '',
      eatingHabits: myProfile.eatingHabits ?? '',
      disability: myProfile.disability ?? '',
      religion: myProfile.religion ?? '',
      caste: myProfile.caste ?? '',
      motherTongue: myProfile.motherTongue ?? '',
      birthTime: myProfile.birthTime ?? '',
      placeOfBirth: myProfile.placeOfBirth ?? '',
      raashi: myProfile.raashi ?? '',
      nakshathra: myProfile.nakshathra ?? '',
      gana: myProfile.gana ?? '',
      gotra: myProfile.gotra ?? '',
      dosham: myProfile.dosham ?? '',
      bali: myProfile.bali ?? '',
      education: (myProfile.education ?? '') as EducationLevel | '',
      educationField: myProfile.educationField ?? '',
      workingWith: myProfile.workingWith ?? '',
      designation: myProfile.designation ?? '',
      workLocation: myProfile.workLocation ?? '',
      annualIncome: myProfile.annualIncome ?? '',
      occupation: myProfile.occupation ?? '',
      familyType: myProfile.familyType ?? '',
      familyValue: myProfile.familyValue ?? '',
      familyLocation: myProfile.familyLocation ?? '',
      fatherName: myProfile.fatherName ?? '',
      fatherStatus: myProfile.fatherStatus ?? '',
      motherName: myProfile.motherName ?? '',
      motherStatus: myProfile.motherStatus ?? '',
      brothers: myProfile.brothers?.toString() ?? '',
      brothersMarried: myProfile.brothersMarried?.toString() ?? '',
      sisters: myProfile.sisters?.toString() ?? '',
      sistersMarried: myProfile.sistersMarried?.toString() ?? '',
      ancestralOrigin: myProfile.ancestralOrigin ?? '',
      photoVisibility: myProfile.photoVisibility ?? '',
    });
  }, [myProfile]);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const selected = assets.slice(0, Math.max(0, 5 - photos.length));
    if (!selected.length) return;
    setUploadingPhoto(true);
    try {
      const urls = (await Promise.all(selected.map(async (asset) => {
        const filename = asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = asset.mimeType ?? (match ? `image/${match[1].toLowerCase().replace('jpg','jpeg')}` : 'image/jpeg');
        return uploadMatrimonyPhoto(asset.uri, filename, mimeType);
      }))).filter((u): u is string => !!u);
      if (urls.length) setPhotos(p => [...p, ...urls].slice(0, 5));
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message ?? e?.message ?? 'Could not upload.');
    } finally { setUploadingPhoto(false); }
  };

  const handlePickFromGallery = async () => {
    setShowPhotoSheet(false);
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, 5 - photos.length)) as File[];
        if (!files.length) return;
        const uris = files.map(f => URL.createObjectURL(f));
        setUploadingPhoto(true);
        try {
          const urls = (await Promise.all(files.map((f, i) =>
            uploadMatrimonyPhoto(uris[i], f.name, f.type || 'image/jpeg')
          ))).filter((u): u is string => !!u);
          if (urls.length) setPhotos(p => [...p, ...urls].slice(0, 5));
        } finally { setUploadingPhoto(false); uris.forEach(u => URL.revokeObjectURL(u)); }
      };
      input.click(); return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 5 - photos.length), quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) await uploadAssets(result.assets);
  };

  const handleTakePhoto = async () => {
    setShowPhotoSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
    if (!result.canceled && result.assets?.length) await uploadAssets(result.assets);
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));
  const movePhoto = (idx: number, dir: -1 | 1) => setPhotos(cur => {
    const next = idx + dir;
    if (next < 0 || next >= cur.length) return cur;
    const r = [...cur]; [r[idx], r[next]] = [r[next], r[idx]]; return r;
  });

  const handleSubmit = async () => {
    if (photos.length < 4) { Alert.alert('More Photos Required', 'Please upload at least 4 photos.'); return; }
    if (!consents.accurate || !consents.terms || !consents.privacy || !consents.display) {
      Alert.alert('Declaration Required', 'Please check all declaration boxes.'); return;
    }
    const ok = await useConfirmStore.getState().confirm({
      title: myProfile?.id ? 'Save profile changes?' : 'Submit profile?',
      message: myProfile?.id ? 'Your updated profile will be sent for review.' : 'Your matrimony profile will be submitted for verification.',
      confirmText: myProfile?.id ? 'Save' : 'Submit',
      cancelText: 'Cancel', isDestructive: false, icon: 'heart-outline',
    });
    if (!ok) return;
    const toNum = (v: string) => { const n = parseInt(v); return isNaN(n) ? undefined : n; };
    const payload: any = {
      ...form,
      brothers: toNum(form.brothers), brothersMarried: toNum(form.brothersMarried),
      sisters: toNum(form.sisters), sistersMarried: toNum(form.sistersMarried),
      photos,
    };
    try {
      if (myProfile?.id) { await updateMutation.mutateAsync({ id: myProfile.id, data: payload }); }
      else { await createMutation.mutateAsync(payload); }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to save profile');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputStyle = [styles.textInput, { backgroundColor: colors.elevation1, borderColor: colors.border, color: colors.text }];

  if (profileLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={() => step > 0 ? setStep(s => s - 1) : (router.canGoBack() ? router.back() : router.replace('/matrimony' as any))}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{myProfile?.id ? 'Edit Profile' : 'Create Profile'}</Text>
          <Text style={styles.headerSub}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
        </View>
      </View>

      <View style={[styles.stepBar, { backgroundColor: colors.surface }]}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.stepDot, { backgroundColor: i <= step ? colors.primary : colors.border }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {myProfile?.id && step === 0 && (
          <ApprovalBanner status={myProfile.approvalStatus} rejectionReason={myProfile.rejectionReason} colors={colors} />
        )}

        {step === 0 && (
          <>
            <SectionHeader title="Personal Details" colors={colors} />
            <FieldLabel label="Full Name *" colors={colors} />
            <TextInput style={inputStyle} value={form.displayName} onChangeText={set('displayName')} placeholder="Your full name" placeholderTextColor={colors.textMuted} />
            <ChipGroup label="Gender *" options={['MALE','FEMALE','OTHER']} value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v as Gender }))} colors={colors} />
            <FieldLabel label="Date of Birth *" colors={colors} />
            <TouchableOpacity style={[inputStyle, styles.rowBetween, { marginBottom: 14 }]} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: form.dateOfBirth ? colors.text : colors.textMuted }}>{form.dateOfBirth || 'Select date of birth'}</Text>
              <Ionicons name="calendar-outline" size={19} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={form.dateOfBirth ? new Date(`${form.dateOfBirth}T12:00:00`) : new Date(1995, 0, 1)}
                mode="date" maximumDate={new Date()}
                onValueChange={(_e: any, d?: Date) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (d) set('dateOfBirth')(d.toISOString().slice(0, 10)); }}
                onDismiss={() => setShowDatePicker(false)}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
            <Dropdown label="Marital Status *" options={MARITAL_STATUS_OPTIONS.map(o => MARITAL_STATUS_LABELS[o])} value={form.maritalStatus ? MARITAL_STATUS_LABELS[form.maritalStatus as MaritalStatus] : ''} onChange={v => { const k = MARITAL_STATUS_OPTIONS.find(o => MARITAL_STATUS_LABELS[o] === v); if (k) setForm(f => ({ ...f, maritalStatus: k })); }} colors={colors} />
            <Dropdown label="Height *" options={HEIGHT_OPTIONS} value={form.height} onChange={set('height')} colors={colors} />
            <Dropdown label="Blood Group *" options={BLOOD_GROUP_OPTIONS} value={form.bloodGroup} onChange={set('bloodGroup')} colors={colors} />
            <Dropdown label="Eating Habits *" options={EATING_HABITS_OPTIONS} value={form.eatingHabits} onChange={set('eatingHabits')} colors={colors} />
            <Dropdown label="Disability *" options={DISABILITY_OPTIONS} value={form.disability} onChange={set('disability')} colors={colors} />
            <FieldLabel label="Religion" colors={colors} />
            <TextInput style={inputStyle} value={form.religion} onChangeText={set('religion')} placeholder="e.g. Hindu" placeholderTextColor={colors.textMuted} />
            <FieldLabel label="Caste" colors={colors} />
            <TextInput style={inputStyle} value={form.caste} onChangeText={set('caste')} placeholder="e.g. Gowda" placeholderTextColor={colors.textMuted} />
            <FieldLabel label="Mother Tongue" colors={colors} />
            <TextInput style={inputStyle} value={form.motherTongue} onChangeText={set('motherTongue')} placeholder="e.g. Kannada" placeholderTextColor={colors.textMuted} />
          </>
        )}

        {step === 1 && (
          <>
            <SectionHeader title="Astrology & Birth Details" colors={colors} />
            <FieldLabel label="Birth Time *" colors={colors} />
            <TouchableOpacity style={[inputStyle, styles.rowBetween, { marginBottom: 14 }]} onPress={() => setShowTimePicker(true)}>
              <Text style={{ color: form.birthTime ? colors.text : colors.textMuted }}>{form.birthTime || 'Select birth time'}</Text>
              <Ionicons name="time-outline" size={19} color={colors.primary} />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={(() => { if (form.birthTime) { const [h, m] = form.birthTime.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d; } return new Date(); })()}
                mode="time"
                onValueChange={(_e: any, d?: Date) => { if (Platform.OS !== 'ios') setShowTimePicker(false); if (d) set('birthTime')(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`); }}
                onDismiss={() => setShowTimePicker(false)}
              />
            )}
            {showTimePicker && Platform.OS === 'ios' && (
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
            <FieldLabel label="Place of Birth *" colors={colors} />
            <TextInput style={inputStyle} value={form.placeOfBirth} onChangeText={set('placeOfBirth')} placeholder="e.g. Mysuru, Karnataka" placeholderTextColor={colors.textMuted} />
            <Dropdown label="Raashi *" options={RAASHI_OPTIONS} value={form.raashi} onChange={set('raashi')} colors={colors} />
            <Dropdown label="Nakshathra *" options={NAKSHATHRA_OPTIONS} value={form.nakshathra} onChange={set('nakshathra')} colors={colors} />
            <Dropdown label="Gana *" options={GANA_OPTIONS} value={form.gana} onChange={set('gana')} colors={colors} />
            <SearchableDropdown label="Gotra *" options={GOTRA_LIST} value={form.gotra} onChange={set('gotra')} colors={colors} />
            <Dropdown label="Dosham *" options={DOSHAM_OPTIONS} value={form.dosham} onChange={set('dosham')} colors={colors} />
            <Dropdown label="Bali" options={BALI_OPTIONS} value={form.bali} onChange={set('bali')} colors={colors} />
          </>
        )}

        {step === 2 && (
          <>
            <SectionHeader title="Career & Education" colors={colors} />
            <Dropdown label="Highest Education *" options={EDUCATION_OPTIONS.map(o => EDUCATION_LABELS[o])} value={form.education ? EDUCATION_LABELS[form.education as EducationLevel] : ''} onChange={v => { const k = EDUCATION_OPTIONS.find(o => EDUCATION_LABELS[o] === v); if (k) setForm(f => ({ ...f, education: k })); }} colors={colors} />
            <Dropdown label="Education Field *" options={EDUCATION_FIELD_OPTIONS} value={form.educationField} onChange={set('educationField')} colors={colors} />
            <Dropdown label="Working With *" options={WORKING_WITH_OPTIONS} value={form.workingWith} onChange={set('workingWith')} colors={colors} />
            <FieldLabel label="Designation *" colors={colors} />
            <TextInput style={inputStyle} value={form.designation} onChangeText={set('designation')} placeholder="e.g. Software Engineer" placeholderTextColor={colors.textMuted} />
            <FieldLabel label="Occupation" colors={colors} />
            <TextInput style={inputStyle} value={form.occupation} onChangeText={set('occupation')} placeholder="e.g. IT Professional" placeholderTextColor={colors.textMuted} />
            <FieldLabel label="Work Location *" colors={colors} />
            <TextInput style={inputStyle} value={form.workLocation} onChangeText={set('workLocation')} placeholder="e.g. Bengaluru" placeholderTextColor={colors.textMuted} />
            <Dropdown label="Annual Income *" options={ANNUAL_INCOME_OPTIONS} value={form.annualIncome} onChange={set('annualIncome')} colors={colors} />
          </>
        )}

        {step === 3 && (
          <>
            <SectionHeader title="Family Details" colors={colors} />
            <Dropdown label="Family Type *" options={FAMILY_TYPE_OPTIONS} value={form.familyType} onChange={set('familyType')} colors={colors} />
            <Dropdown label="Family Value *" options={FAMILY_VALUE_OPTIONS} value={form.familyValue} onChange={set('familyValue')} colors={colors} />
            <FieldLabel label="Family Location *" colors={colors} />
            <TextInput style={inputStyle} value={form.familyLocation} onChangeText={set('familyLocation')} placeholder="e.g. Mysuru, Karnataka" placeholderTextColor={colors.textMuted} />
            <FieldLabel label="Father's Name *" colors={colors} />
            <TextInput style={inputStyle} value={form.fatherName} onChangeText={set('fatherName')} placeholder="Father's full name" placeholderTextColor={colors.textMuted} />
            <Dropdown label="Father's Status *" options={FATHER_STATUS_OPTIONS} value={form.fatherStatus} onChange={set('fatherStatus')} colors={colors} />
            <FieldLabel label="Mother's Name" colors={colors} />
            <TextInput style={inputStyle} value={form.motherName} onChangeText={set('motherName')} placeholder="Mother's full name" placeholderTextColor={colors.textMuted} />
            <Dropdown label="Mother's Status *" options={MOTHER_STATUS_OPTIONS} value={form.motherStatus} onChange={set('motherStatus')} colors={colors} />
            <NumberSelector label="Brothers *" options={SIBLING_COUNT_OPTIONS} value={form.brothers} onChange={set('brothers')} colors={colors} />
            <NumberSelector label="Brothers Married *" options={SIBLING_COUNT_OPTIONS} value={form.brothersMarried} onChange={set('brothersMarried')} colors={colors} />
            <NumberSelector label="Sisters *" options={SIBLING_COUNT_OPTIONS} value={form.sisters} onChange={set('sisters')} colors={colors} />
            <NumberSelector label="Sisters Married *" options={SIBLING_COUNT_OPTIONS} value={form.sistersMarried} onChange={set('sistersMarried')} colors={colors} />
            <FieldLabel label="Ancestral / Family Origin *" colors={colors} />
            <TextInput style={inputStyle} value={form.ancestralOrigin} onChangeText={set('ancestralOrigin')} placeholder="e.g. Kodagu, Karnataka" placeholderTextColor={colors.textMuted} />
          </>
        )}

        {step === 4 && (
          <>
            <SectionHeader title="Profile Photos" colors={colors} />
            <View style={styles.photosRow}>
              {photos.map((p, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image source={{ uri: p }} style={styles.photoThumb} contentFit="cover" />
                  <TouchableOpacity style={[styles.removePhotoBtn, { backgroundColor: colors.error }]} onPress={() => removePhoto(i)}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.photoOrderControls}>
                    <TouchableOpacity disabled={i === 0} onPress={() => movePhoto(i, -1)} style={[styles.photoOrderBtn, { opacity: i === 0 ? 0.35 : 1, backgroundColor: colors.primary }]}>
                      <Ionicons name="chevron-back" size={13} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity disabled={i === photos.length - 1} onPress={() => movePhoto(i, 1)} style={[styles.photoOrderBtn, { opacity: i === photos.length - 1 ? 0.35 : 1, backgroundColor: colors.primary }]}>
                      <Ionicons name="chevron-forward" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {i === 0 && <View style={[styles.mainBadge, { backgroundColor: colors.primary }]}><Text style={styles.mainBadgeText}>Main</Text></View>}
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity
                  style={[styles.addPhotoBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}
                  onPress={() => Platform.OS === 'web' ? handlePickFromGallery() : setShowPhotoSheet(true)}
                  disabled={uploadingPhoto}>
                  {uploadingPhoto
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <><Ionicons name="camera-outline" size={24} color={colors.primary} /><Text style={[styles.addPhotoText, { color: colors.primary }]}>Add Photo</Text></>}
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.photoHint, { color: colors.textMuted }]}>{photos.length}/5 photos · First photo is your main profile photo</Text>
            {photos.length < 4 && (
              <View style={[styles.photoWarning, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
                <Ionicons name="warning-outline" size={15} color={colors.error} />
                <Text style={[styles.photoWarningText, { color: colors.error }]}>{`Minimum 4 photos required (${4 - photos.length} more needed)`}</Text>
              </View>
            )}
            <Dropdown label="Photo Visibility *" options={PHOTO_VISIBILITY_OPTIONS} value={form.photoVisibility} onChange={set('photoVisibility')} colors={colors} />
            <SectionHeader title="Declaration & Consent" colors={colors} />
            {([
              ['accurate', 'I confirm that the information provided is accurate.'],
              ['terms', 'I agree to the Terms & Conditions.'],
              ['privacy', 'I agree to the Privacy Policy.'],
              ['display', 'I consent to my profile being displayed to registered Matrimony members.'],
            ] as [keyof typeof consents, string][]).map(([key, label]) => (
              <TouchableOpacity key={key} style={styles.consentRow} onPress={() => setConsents(c => ({ ...c, [key]: !c[key] }))}>
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: consents[key] ? colors.primary : 'transparent' }]}>
                  {consents[key] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.consentText, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]} onPress={handleSubmit} disabled={isPending}>
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>{myProfile?.id ? 'Save Changes' : 'Submit Matrimony Profile'}</Text>}
            </TouchableOpacity>
          </>
        )}

        {step < 4 && (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.nextBtnText}>Next: {STEPS[step + 1]} &rarr;</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showPhotoSheet} transparent animationType="slide">
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowPhotoSheet(false)}>
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Profile Photo</Text>
            <TouchableOpacity style={[styles.sheetRow, { borderBottomColor: colors.border }]} onPress={handleTakePhoto}>
              <View style={[styles.sheetIconWrap, { backgroundColor: colors.primaryContainer }]}><Ionicons name="camera" size={22} color={colors.primary} /></View>
              <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetRow, { borderBottomColor: colors.border }]} onPress={handlePickFromGallery}>
              <View style={[styles.sheetIconWrap, { backgroundColor: colors.primaryContainer }]}><Ionicons name="images" size={22} color={colors.primary} /></View>
              <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Choose from Gallery</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetCancel, { backgroundColor: colors.elevation1 }]} onPress={() => setShowPhotoSheet(false)}>
              <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
